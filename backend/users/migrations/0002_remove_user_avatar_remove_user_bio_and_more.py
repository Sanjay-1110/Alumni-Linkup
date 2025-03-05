# Generated by Django 5.0.2 on 2025-03-04 18:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='avatar',
        ),
        migrations.RemoveField(
            model_name='user',
            name='bio',
        ),
        migrations.RemoveField(
            model_name='user',
            name='institution',
        ),
        migrations.RemoveField(
            model_name='user',
            name='linkedin_url',
        ),
        migrations.RemoveField(
            model_name='user',
            name='role',
        ),
        migrations.AddField(
            model_name='user',
            name='google_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='department',
            field=models.CharField(blank=True, choices=[('CSE', 'Computer Science and Engineering'), ('EEE', 'Electrical and Electronics Engineering'), ('ECE', 'Electronics and Communication Engineering'), ('AGRI', 'Agriculture')], max_length=10, null=True),
        ),
    ]
