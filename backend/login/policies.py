from core.policies import BaseAccessPolicy


class LoginAccessPolicy(BaseAccessPolicy):
    id = 'login-policy'
    resource_name = 'login'
