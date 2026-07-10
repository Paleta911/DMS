import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// JWT authentication guard: validates Bearer token and attaches decoded payload to request.user
// Uses Passport JWT strategy configured with secret from environment
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
