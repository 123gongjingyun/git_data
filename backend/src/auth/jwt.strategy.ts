import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService, AuthUserPayload } from "./auth.service";
import { runtimeConfig } from "../config/runtime";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: runtimeConfig.jwtSecret,
    });
  }

  async validate(payload: AuthUserPayload) {
    return this.authService.findAuthenticatedUser(payload.sub);
  }
}
