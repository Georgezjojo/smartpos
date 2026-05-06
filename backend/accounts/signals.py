from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from businesses.models import Branch

User = get_user_model()

@receiver(post_save, sender=User)
def auto_assign_manager(sender, instance, created, **kwargs):
    """
    When a user is created or their branch changes, assign the branch's manager
    as their manager (only if the user is NOT a manager themselves).
    """
    if instance.role in ('cashier',):   # or any non‑manager role
        if instance.branch:
            # Set manager to the branch's manager, if any
            branch = instance.branch
            if branch.manager and branch.manager != instance:
                instance.manager = branch.manager
            else:
                instance.manager = None
            # Save only if changed to avoid infinite recursion
            User.objects.filter(pk=instance.pk).update(manager=instance.manager)


@receiver(post_save, sender=Branch)
def update_accountants_on_branch_manager_change(sender, instance, **kwargs):
    """
    If a branch's manager changes, update all non‑manager users of that branch
    to reflect the new manager.
    """
    users = User.objects.filter(branch=instance, role__in=['cashier'])
    if instance.manager:
        users.update(manager=instance.manager)
    else:
        users.update(manager=None)


@receiver(pre_delete, sender=User)
def clear_branch_manager_on_delete(sender, instance, **kwargs):
    """
    If a manager is deleted, remove them from any branch they managed
    and clear the manager field for their accountants.
    """
    if instance.role == 'manager':
        # Clear the manager field on branches they managed
        Branch.objects.filter(manager=instance).update(manager=None)
        # Clear the manager field on their accountants
        User.objects.filter(manager=instance).update(manager=None)