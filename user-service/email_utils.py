import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
import os

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "Stratify")
BACKEND_URL = os.getenv("USER_URL")

def send_verification_email(to_email, token):
    msg = EmailMessage()
    msg["Subject"] = "Welcome to Stratify! Please Verify Your Email"
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email

    body = f"""
Hi there,

Thanks for signing up for Stratify! 🚀

Please verify your email by clicking the link below:
👉 {BACKEND_URL}/api/user/verify/{token}

If you didn't request this, you can safely ignore this message.

Thanks,  
The Stratify Team
"""
    msg.set_content(body)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(msg)

def send_reset_email(to_email, reset_link):
    msg = EmailMessage()
    msg["Subject"] = "Stratify Password Reset"
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    body = f"""
Hi there,

We received a request to reset your Stratify password.

Click the link below to reset your password:
👉 {reset_link}

If you didn't request this, you can safely ignore this message.

Thanks,
The Stratify Team
"""
    msg.set_content(body)
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(msg)
