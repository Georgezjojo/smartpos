import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartpos.settings')

app = Celery('smartpos')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'send-daily-summary-every-morning': {
        'task': 'reports.tasks.send_daily_summary_emails',
        'schedule': crontab(hour=8, minute=0),
    },
    'send-monthly-summary-first-day': {
        'task': 'reports.tasks.send_monthly_summary_emails',
        'schedule': crontab(hour=8, minute=0, day_of_month=1),
    },
    'send-yearly-summary-jan-first': {
        'task': 'reports.tasks.send_yearly_summary_emails',
        'schedule': crontab(hour=8, minute=0, month_of_year=1, day_of_month=1),
    },
}