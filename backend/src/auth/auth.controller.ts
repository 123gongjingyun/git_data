import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  AuthService,
  type AuthenticatedUser,
} from "./auth.service";

class LoginDto {
  username!: string;
  password!: string;
}

class RegisterDto {
  username!: string;
  displayName?: string;
  email!: string;
  password!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post("login")
  async login(@Body() body: LoginDto) {
    const { username, password } = body;
    return this.authService.login(username, password);
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("me")
  getProfile(@Req() req: { user?: AuthenticatedUser }) {
    return req.user;
  }
}
