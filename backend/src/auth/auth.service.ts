import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { verifyPassword } from "./password.utils";
import { User } from "../domain/entities/user.entity";
import {
  getEffectiveActionKeys,
  getEffectiveMenuKeys,
  getPermissionProfile,
  getRoleActionKeys,
  getRoleMenuKeys,
  type UserRole,
} from "../users/user-access";
import { UsersService } from "../users/users.service";

export interface AuthUserPayload {
  sub: number;
  username: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  displayName?: string;
  email?: string;
  role: UserRole;
  roleLabel: string;
  permissions: string[];
  permissionSummary: string;
  roleMenuKeys: string[];
  allowedMenuKeys: string[];
  deniedMenuKeys: string[];
  effectiveMenuKeys: string[];
  roleActionKeys: string[];
  allowedActionKeys: string[];
  deniedActionKeys: string[];
  effectiveActionKeys: string[];
  isActive: boolean;
  mainIndustry: string[];
  teamRole?: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.usersService.ensureSeedUsers();
  }

  async register(input: {
    username: string;
    displayName?: string;
    email: string;
    password: string;
  }) {
    const username = input.username?.trim();
    const email = input.email?.trim();
    const password = input.password?.trim();

    if (!username || !email || !password) {
      throw new BadRequestException("用户名、邮箱和密码不能为空");
    }

    if (password.length < 8) {
      throw new BadRequestException("密码长度不能少于 8 位");
    }

    const user = await this.usersService.create({
      username,
      displayName: input.displayName?.trim() || username,
      email,
      password,
      role: "pre_sales_engineer",
      isActive: true,
    });

    return this.issueToken(user.id, user.username, user.role);
  }

  async validateUser(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    if (!username || !password) {
      throw new UnauthorizedException("用户名或密码不能为空");
    }

    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("LOWER(user.username) = :identifier", {
        identifier: username.trim().toLowerCase(),
      })
      .orWhere("LOWER(user.email) = :identifier", {
        identifier: username.trim().toLowerCase(),
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException("用户名或密码不正确");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("你的账号已经被禁止登陆");
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("用户名或密码不正确");
    }

    return this.toAuthenticatedUser(user);
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    await this.usersService.touchLastLogin(user.id);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    } satisfies AuthUserPayload);

    return {
      accessToken,
      user: await this.findAuthenticatedUser(user.id),
    };
  }

  async findAuthenticatedUser(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("当前登录状态已失效");
    }
    return this.toAuthenticatedUser(user);
  }

  private async issueToken(id: number, username: string, role: UserRole) {
    const accessToken = await this.jwtService.signAsync({
      sub: id,
      username,
      role,
    } satisfies AuthUserPayload);

    return {
      accessToken,
      user: await this.usersService.findViewById(id),
    };
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    const permissionProfile = getPermissionProfile(user.role);
    const allowedMenuKeys = user.allowedMenuKeys || [];
    const deniedMenuKeys = user.deniedMenuKeys || [];
    const allowedActionKeys = user.allowedActionKeys || [];
    const deniedActionKeys = user.deniedActionKeys || [];
    const effectiveMenuKeys = getEffectiveMenuKeys(
      user.role,
      allowedMenuKeys,
      deniedMenuKeys,
    );
    const effectiveActionKeys = getEffectiveActionKeys(
      user.role,
      allowedActionKeys,
      deniedActionKeys,
    );
    const permissions = Array.from(
      new Set([
        ...permissionProfile.permissions,
        ...effectiveMenuKeys,
        ...effectiveActionKeys,
      ]),
    );
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || undefined,
      email: user.email || undefined,
      role: user.role,
      roleLabel: permissionProfile.roleLabel,
      permissions,
      permissionSummary: permissionProfile.permissionSummary,
      roleMenuKeys: getRoleMenuKeys(user.role),
      allowedMenuKeys,
      deniedMenuKeys,
      effectiveMenuKeys,
      roleActionKeys: getRoleActionKeys(user.role),
      allowedActionKeys,
      deniedActionKeys,
      effectiveActionKeys,
      isActive: user.isActive,
      mainIndustry: user.mainIndustry || [],
      teamRole: user.teamRole || undefined,
    };
  }
}
