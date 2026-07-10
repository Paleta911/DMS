import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Optional JWT guard: attempts authentication but does not fail if token missing/invalid
// Sets request.user to null if auth fails, allowing endpoints to handle both authenticated and anonymous users
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override to suppress auth errors; returns null if auth fails instead of throwing
  handleRequest(err: unknown, user: any) {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
