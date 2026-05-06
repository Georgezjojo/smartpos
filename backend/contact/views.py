from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.mail import send_mail
from django.conf import settings

class ContactView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get('name')
        email = request.data.get('email')
        message = request.data.get('message')
        if not name or not email or not message:
            return Response({'error': 'All fields are required.'}, status=400)

        full_message = f"From: {name} <{email}>\n\n{message}"
        recipients = []
        if settings.ADMIN_EMAIL:
            recipients.append(settings.ADMIN_EMAIL)
        if settings.DEVELOPER_EMAIL:
            recipients.append(settings.DEVELOPER_EMAIL)
        if not recipients:
            return Response({'error': 'No recipient configured.'}, status=500)

        try:
            send_mail(
                f'SmartPOS Contact Form - {name}',
                full_message,
                email,
                recipients,
                fail_silently=False,
            )
            return Response({'message': 'Your message has been sent. We will get back to you soon.'})
        except Exception:
            return Response({'error': 'Could not send message. Please try again later.'}, status=500)