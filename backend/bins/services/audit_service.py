import logging
from bins.models import AuditLog

logger = logging.getLogger(__name__)

def log_action(user, action, module, record_id, changes=None, municipality=None, zone=None, actor_name=None):
    """
    Centralized service to create an AuditLog entry.
    """
    try:
        # Determine actor
        resolved_actor = actor_name
        role = ''
        
        if user and not resolved_actor:
            resolved_actor = user.user.get_full_name() or user.user.username
            role = user.role
        elif not resolved_actor:
            resolved_actor = 'SYSTEM'
            
        AuditLog.objects.create(
            user=user,
            actor_name=resolved_actor,
            role=role,
            action=action,
            module=module,
            record_id=str(record_id),
            municipality=municipality,
            zone=zone,
            changes=changes
        )
    except Exception as e:
        # We catch exceptions here to ensure that audit logging doesn't 
        # unnecessarily crash the primary business transaction,
        # but we log it as an error to the system logs.
        logger.error(f"Failed to create AuditLog: {str(e)}")
