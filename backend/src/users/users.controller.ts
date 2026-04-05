import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { type AuthenticatedUser } from "../auth/auth.service";
import { isUserRole, type UserRole } from "./user-access";
import {
  type CreateUserInput,
  type ChangeCurrentUserPasswordInput,
  type ListUsersQuery,
  type UpdateCurrentUserInput,
  type UpdateUserInput,
  UsersService,
} from "./users.service";

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

class CreateUserDto {
  username!: string;
  displayName?: string;
  email!: string;
  password!: string;
  role?: UserRole;
  isActive?: boolean;
  mainIndustry?: string[];
  teamRole?: string;
}

class UpdateUserDto {
  displayName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
  mainIndustry?: string[];
  teamRole?: string;
}

class UpdateUserMenuPermissionsDto {
  allowedMenuKeys?: string[];
  deniedMenuKeys?: string[];
}

class UpdateUserActionPermissionsDto {
  allowedActionKeys?: string[];
  deniedActionKeys?: string[];
}

class UpdateCurrentUserDto {
  displayName?: string;
  email?: string;
  mainIndustry?: string[];
  teamRole?: string;
}

class ChangeCurrentUserPasswordDto {
  currentPassword!: string;
  newPassword!: string;
  confirmPassword!: string;
}

@UseGuards(AuthGuard("jwt"))
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query() query: ListUsersQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertManagePermission(req.user);
    return this.usersService.findAll(query);
  }

  @Get("/permission-menus")
  listPermissionMenus(@Req() req: AuthenticatedRequest) {
    this.assertMenuPermissionManage(req.user);
    return this.usersService.getMenuPermissionDefinitions();
  }

  @Get("/permission-actions")
  listPermissionActions(@Req() req: AuthenticatedRequest) {
    this.assertActionPermissionManage(req.user);
    return this.usersService.getActionPermissionDefinitions();
  }

  @Get("me")
  getCurrentUser(@Req() req: AuthenticatedRequest) {
    return this.usersService.findViewById(req.user.id);
  }

  @Patch("me")
  updateCurrentUser(
    @Body() body: UpdateCurrentUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateCurrentUser(
      req.user.id,
      this.normalizeCurrentUserDto(body),
    );
  }

  @Post("me/change-password")
  changeCurrentUserPassword(
    @Body() body: ChangeCurrentUserPasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.changeCurrentUserPassword(
      req.user.id,
      this.normalizeCurrentUserPasswordDto(body),
    );
  }

  @Get(":id/menu-permissions")
  getMenuPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertMenuPermissionManage(req.user);
    return this.usersService.getUserMenuPermissions(id);
  }

  @Patch(":id/menu-permissions")
  updateMenuPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserMenuPermissionsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertMenuPermissionManage(req.user);
    return this.usersService.updateUserMenuPermissions(id, {
      allowedMenuKeys: Array.isArray(body.allowedMenuKeys)
        ? body.allowedMenuKeys
        : [],
      deniedMenuKeys: Array.isArray(body.deniedMenuKeys)
        ? body.deniedMenuKeys
        : [],
    });
  }

  @Post(":id/menu-permissions/reset")
  resetMenuPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertMenuPermissionManage(req.user);
    return this.usersService.resetUserMenuPermissions(id);
  }

  @Get(":id/action-permissions")
  getActionPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertActionPermissionManage(req.user);
    return this.usersService.getUserActionPermissions(id);
  }

  @Patch(":id/action-permissions")
  updateActionPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserActionPermissionsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertActionPermissionManage(req.user);
    return this.usersService.updateUserActionPermissions(id, {
      allowedActionKeys: Array.isArray(body.allowedActionKeys)
        ? body.allowedActionKeys
        : [],
      deniedActionKeys: Array.isArray(body.deniedActionKeys)
        ? body.deniedActionKeys
        : [],
    });
  }

  @Post(":id/action-permissions/reset")
  resetActionPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertActionPermissionManage(req.user);
    return this.usersService.resetUserActionPermissions(id);
  }

  @Post()
  create(
    @Body() body: CreateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertManagePermission(req.user);
    return this.usersService.create(this.normalizeCreateDto(body));
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertManagePermission(req.user);
    return this.usersService.update(id, this.normalizeUpdateDto(body));
  }

  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertManagePermission(req.user);
    if (req.user.id === id) {
      throw new ForbiddenException("不能删除当前登录用户");
    }
    return this.usersService.remove(id);
  }

  private assertManagePermission(user: AuthenticatedUser) {
    if (!(user.role === "admin" || user.role === "manager")) {
      throw new ForbiddenException("当前角色无权管理团队成员");
    }
  }

  private assertMenuPermissionManage(user: AuthenticatedUser) {
    if (!user.permissions.includes("menu-permission.manage")) {
      throw new ForbiddenException("当前角色无权维护菜单权限");
    }
  }

  private assertActionPermissionManage(user: AuthenticatedUser) {
    if (!user.permissions.includes("action-permission.manage")) {
      throw new ForbiddenException("当前角色无权维护操作权限");
    }
  }

  private normalizeCreateDto(dto: CreateUserDto): CreateUserInput {
    return {
      username: dto.username,
      displayName: dto.displayName,
      email: dto.email,
      password: dto.password,
      role: isUserRole(dto.role || "pre_sales_engineer")
        ? (dto.role || "pre_sales_engineer")
        : "pre_sales_engineer",
      isActive: dto.isActive,
      mainIndustry: Array.isArray(dto.mainIndustry) ? dto.mainIndustry : [],
      teamRole: dto.teamRole,
    };
  }

  private normalizeUpdateDto(dto: UpdateUserDto): UpdateUserInput {
    return {
      displayName: dto.displayName,
      email: dto.email,
      password: dto.password,
      role: dto.role && isUserRole(dto.role) ? dto.role : undefined,
      isActive: dto.isActive,
      mainIndustry: Array.isArray(dto.mainIndustry) ? dto.mainIndustry : undefined,
      teamRole: dto.teamRole,
    };
  }

  private normalizeCurrentUserDto(dto: UpdateCurrentUserDto): UpdateCurrentUserInput {
    return {
      displayName: dto.displayName,
      email: dto.email,
      mainIndustry: Array.isArray(dto.mainIndustry) ? dto.mainIndustry : undefined,
      teamRole: dto.teamRole,
    };
  }

  private normalizeCurrentUserPasswordDto(
    dto: ChangeCurrentUserPasswordDto,
  ): ChangeCurrentUserPasswordInput {
    return {
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
      confirmPassword: dto.confirmPassword,
    };
  }
}
