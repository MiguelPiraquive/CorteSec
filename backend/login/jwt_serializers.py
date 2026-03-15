"""
Custom JWT Serializers for CorteSec
====================================
Adds custom claims (organization, roles) to JWT tokens.
"""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Serializer that adds organization and role claims to JWT."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Custom claims
        token['email'] = user.email
        token['organization_role'] = getattr(user, 'organization_role', 'MEMBER')

        # Organization claim
        org = getattr(user, 'organization', None)
        if org:
            token['organization_id'] = str(org.pk)
            token['organization_code'] = org.codigo
        else:
            token['organization_id'] = None
            token['organization_code'] = None

        return token


def get_tokens_for_user(user):
    """Generate JWT tokens with custom claims for a user."""
    refresh = CustomTokenObtainPairSerializer.get_token(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }
