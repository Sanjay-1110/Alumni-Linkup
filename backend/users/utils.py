class AccountActivationTokenGenerator(PasswordResetTokenGenerator):
    def make_token(self, user):
        return super().make_token(user)

    def decode_token(self, token):
        try:
            # Split the token to get the user id part
            ts_b36, hash = token.split("-")
            ts = base36_to_int(ts_b36)
            
            # Get user ID from timestamp
            for user in User.objects.filter(is_active=False):
                if self._make_token_with_timestamp(user, ts) == token:
                    return user.id
            raise ValueError("Invalid token")
        except Exception as e:
            raise ValueError(f"Token decode error: {str(e)}")

account_activation_token = AccountActivationTokenGenerator() 