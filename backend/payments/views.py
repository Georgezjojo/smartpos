import logging
from django.apps import apps
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import MpesaTransaction
from .serializers import STKPushSerializer, MpesaTransactionSerializer
from .mpesa_api import send_stk_push, query_stk_status

logger = logging.getLogger(__name__)


def get_user_business(request):
    """
    Safely return the Business instance linked to the current user.
    Never returns a string – uses the actual foreign key.
    """
    # 1. If the user model has a 'business' ForeignKey (most common)
    if hasattr(request.user, 'business_id') and request.user.business_id:
        Business = apps.get_model('business', 'Business')
        try:
            return Business.objects.get(id=request.user.business_id)
        except Business.DoesNotExist:
            pass

    # 2. Fallback: business where owner = user
    Business = apps.get_model('business', 'Business')
    business = Business.objects.filter(owner=request.user).first()
    if business:
        return business

    # 3. If you have a separate Profile model, add it here

    return None


class MpesaSTKPushView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = STKPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        business = get_user_business(request)
        if not business:
            return Response({'detail': 'No business linked to your account.'}, status=403)

        # Create a Pending transaction – business is now a real instance
        transaction = MpesaTransaction.objects.create(
            business=business,
            phone=data['phone'],
            amount=data['amount'],
            account_reference=data['account_reference'],
            transaction_desc=data.get('transaction_desc', 'Sale Payment'),
            status=MpesaTransaction.Status.PENDING,
        )

        try:
            result = send_stk_push(
                data['phone'], data['amount'], data['account_reference'],
                transaction_desc=transaction.transaction_desc
            )
            transaction.checkout_request_id = result['checkout_request_id']
            transaction.merchant_request_id = result.get('merchant_request_id')
            transaction.save()
            return Response({
                'checkout_request_id': result['checkout_request_id']
            }, status=status.HTTP_200_OK)
        except Exception as e:
            transaction.status = MpesaTransaction.Status.FAILED
            transaction.result_description = str(e)
            transaction.save()
            logger.error("STK Push failed: %s", e)
            return Response({'detail': f'STK Push failed: {e}'}, status=500)


class MpesaStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        checkout_request_id = request.query_params.get('checkout_request_id')
        if not checkout_request_id:
            return Response({'detail': 'checkout_request_id required'}, status=400)

        business = get_user_business(request)
        if not business:
            return Response({'detail': 'No business linked.'}, status=403)

        transaction = get_object_or_404(
            MpesaTransaction,
            checkout_request_id=checkout_request_id,
            business=business
        )

        if transaction.status in [MpesaTransaction.Status.SUCCESS, MpesaTransaction.Status.FAILED]:
            return Response({'status': transaction.status})

        try:
            result = query_stk_status(checkout_request_id)
            if result['status'] == 'Success':
                transaction.status = MpesaTransaction.Status.SUCCESS
                transaction.mpesa_receipt_number = result.get('mpesa_receipt_number')
            elif result['status'] == 'Failed':
                transaction.status = MpesaTransaction.Status.FAILED
            transaction.result_code = result['result_code']
            transaction.result_description = result['result_description']
            transaction.save()
            return Response({'status': transaction.status})
        except Exception as e:
            logger.error("Mpesa status query failed: %s", e)
            return Response({'status': transaction.status, 'detail': 'Query failed'}, status=500)


class RecentPaymentsView(generics.ListAPIView):
    serializer_class = MpesaTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        business = get_user_business(self.request)
        if not business:
            return MpesaTransaction.objects.none()
        return MpesaTransaction.objects.filter(
            business=business,
            status=MpesaTransaction.Status.SUCCESS,
            sale__isnull=True
        ).order_by('-created_at')[:30]


class ConfirmPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        business = get_user_business(request)
        if not business:
            return Response({'detail': 'No business linked.'}, status=403)

        transaction = get_object_or_404(
            MpesaTransaction, id=pk, business=business,
            status=MpesaTransaction.Status.SUCCESS
        )

        sale_id = request.data.get('sale_id')
        if sale_id:
            Sale = apps.get_model('sales', 'Sale')
            try:
                sale = Sale.objects.get(id=sale_id, business=business)
                transaction.sale = sale
            except Sale.DoesNotExist:
                return Response({'detail': 'Sale not found.'}, status=404)

        transaction.status = MpesaTransaction.Status.USED
        transaction.save()
        return Response(MpesaTransactionSerializer(transaction).data)


class MpesaCallbackView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        logger.info("M-Pesa callback: %s", request.data)
        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})