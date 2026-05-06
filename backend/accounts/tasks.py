from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import requests

@shared_task
def send_otp_email(email, code):
    send_mail(
        'SmartPOS OTP Code',
        f'Your OTP code is {code}. Valid for 60 seconds.',
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )

@shared_task
def send_otp_sms(phone, code):
    url = "https://api.sandbox.africastalking.com/version1/messaging"
    headers = {
        "ApiKey": settings.AFRICASTALKING_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    payload = {
        "username": settings.AFRICASTALKING_USERNAME,
        "to": phone,
        "message": f"Your SmartPOS OTP is {code}"
    }
    try:
        requests.post(url, headers=headers, data=payload)
    except Exception:
        pass

@shared_task
def send_notification_email(user_email, subject, message):
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user_email],
        fail_silently=False,
    )

@shared_task
def send_welcome_email(email, full_name):
    if not email:
        return
    subject = f'Welcome to SmartPOS, {full_name}!'
    message = (
        f'Hi {full_name},\n\n'
        'Thank you for choosing SmartPOS! Your business is now live.\n'
        'You can now:\n'
        '• Add products and stock\n'
        '• Process sales with our modern POS\n'
        '• View dashboards and reports\n'
        '• Manage users and branches\n\n'
        'We’re here to help you grow. If you have any questions, just reply to this email or visit our Contact page.\n\n'
        'Happy selling!\n'
        'The SmartPOS Team'
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)

@shared_task
def send_welcome_sms(phone, full_name):
    if not phone:
        return
    message = f'Welcome {full_name}! Your SmartPOS account is ready. Start selling today!'
    try:
        requests.post(
            "https://api.sandbox.africastalking.com/version1/messaging",
            headers={
                "ApiKey": settings.AFRICASTALKING_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "username": settings.AFRICASTALKING_USERNAME,
                "to": phone,
                "message": message,
            },
        )
    except Exception:
        pass