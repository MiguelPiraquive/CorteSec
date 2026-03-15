from .base import BaseAccessPolicy


class CoreAccessPolicy(BaseAccessPolicy):
    id = 'core-policy'
    resource_name = 'core'
