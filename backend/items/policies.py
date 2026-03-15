from core.policies import BaseAccessPolicy


class ItemsAccessPolicy(BaseAccessPolicy):
    id = 'items-policy'
    resource_name = 'items'
