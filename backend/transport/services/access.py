def company_ids_for_user(user):
    """Return managed company IDs, None for a superuser, or an empty set."""
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return None

    company_ids = set(
        user.admin_companies.filter(is_active=True).values_list('id', flat=True)
    )
    company = getattr(user, 'company_admin', None)
    if company and company.is_active:
        company_ids.add(company.id)
    agent = getattr(user, 'agentguichet', None)
    if agent and agent.actif and agent.compagnie.is_active:
        company_ids.add(agent.compagnie_id)
    return company_ids


def can_manage_scheduled_trip(user, scheduled_trip):
    company_ids = company_ids_for_user(user)
    return company_ids is None or scheduled_trip.trip.company_id in company_ids


def can_administer_company(user, company_id):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    from transport.models import Company

    return Company.objects.filter(
        id=company_id,
        is_active=True,
    ).filter(
        models_q_for_company_admin(user)
    ).exists()


def admin_company_ids_for_user(user):
    """Return company IDs the user administers; agents are intentionally excluded."""
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return None
    company_ids = set(
        user.admin_companies.filter(is_active=True).values_list('id', flat=True)
    )
    company = getattr(user, 'company_admin', None)
    if company and company.is_active:
        company_ids.add(company.id)
    return company_ids


def models_q_for_company_admin(user):
    from django.db.models import Q

    return Q(admin_user=user) | Q(admins=user)
