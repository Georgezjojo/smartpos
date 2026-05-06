import requests
import base64
import logging
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)

# Safaricom Daraja API endpoints
OAUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
STKPUSH_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
QUERY_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'

# Replace with your actual keys and shortcode
CONSUMER_KEY = settings.MPESA_CONSUMER_KEY
CONSUMER_SECRET = settings.MPESA_CONSUMER_SECRET
BUSINESS_SHORTCODE = settings.MPESA_SHORTCODE
PASSKEY = settings.MPESA_PASSKEY
CALLBACK_URL = settings.MPESA_CALLBACK_URL  # e.g., https://yourdomain.com/api/payments/mpesa/callback/

def get_access_token():
    """Return OAuth access token from Safaricom."""
    auth = base64.b64encode(f"{CONSUMER_KEY}:{CONSUMER_SECRET}".encode()).decode()
    headers = {'Authorization': f'Basic {auth}'}
    response = requests.get(OAUTH_URL, headers=headers, timeout=10)
    response.raise_for_status()
    return response.json()['access_token']

def generate_password(shortcode, passkey, timestamp):
    """Generate the Lipa Na M-Pesa Online password."""
    data = f"{shortcode}{passkey}{timestamp}"
    import base64 as b64
    return b64.b64encode(data.encode()).decode()

def send_stk_push(phone, amount, account_reference, transaction_desc='Sale Payment'):
    """Initiate STK Push and return checkout_request_id."""
    token = get_access_token()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = generate_password(BUSINESS_SHORTCODE, PASSKEY, timestamp)

    payload = {
        "BusinessShortCode": BUSINESS_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",   # or "CustomerBuyGoodsOnline" for Till
        "Amount": int(float(amount)),  # must be integer
        "PartyA": phone,
        "PartyB": BUSINESS_SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": CALLBACK_URL,
        "AccountReference": account_reference,
        "TransactionDesc": transaction_desc,
    }

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }

    response = requests.post(STKPUSH_URL, json=payload, headers=headers, timeout=15)
    response.raise_for_status()
    data = response.json()
    checkout_request_id = data.get('CheckoutRequestID')
    if not checkout_request_id:
        raise Exception("No CheckoutRequestID in response")

    return {
        'checkout_request_id': checkout_request_id,
        'merchant_request_id': data.get('MerchantRequestID'),
        'response_code': data.get('ResponseCode'),
        'response_description': data.get('ResponseDescription'),
    }

def query_stk_status(checkout_request_id):
    """Query STK Push status."""
    token = get_access_token()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = generate_password(BUSINESS_SHORTCODE, PASSKEY, timestamp)

    payload = {
        "BusinessShortCode": BUSINESS_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id,
    }

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }

    response = requests.post(QUERY_URL, json=payload, headers=headers, timeout=15)
    response.raise_for_status()
    data = response.json()
    result_code = data.get('ResultCode')
    status = 'Pending'
    if result_code == '0':
        status = 'Success'
    elif result_code and result_code != '0':
        status = 'Failed'

    return {
        'status': status,
        'result_code': result_code,
        'result_description': data.get('ResultDesc'),
        'mpesa_receipt_number': data.get('MpesaReceiptNumber'),
    }