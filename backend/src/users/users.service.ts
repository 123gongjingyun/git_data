import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { hashPassword } from "../auth/password.utils";
import { verifyPassword } from "../auth/password.utils";
import { User } from "../domain/entities/user.entity";
import {
  ACTION_PERMISSION_DEFINITIONS,
  getEffectiveActionKeys,
  getEffectiveMenuKeys,
  getRoleActionKeys,
  getRoleMenuKeys,
  getPermissionProfile,
  MENU_PERMISSION_DEFINITIONS,
  isUserRole,
  type UserRole,
} from "./user-access";

export interface ListUsersQuery {
  keyword?: string;
  role?: string;
  status?: string;
}

export interface CreateUserInput {
  username: string;
  displayName?: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
  mainIndustry?: string[];
  teamRole?: string;
}

export interface UpdateUserInput {
  displayName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
  mainIndustry?: string[];
  teamRole?: string;
}

export interface UpdateCurrentUserInput {
  displayName?: string;
  email?: string;
  mainIndustry?: string[];
  teamRole?: string;
}

export interface ChangeCurrentUserPasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserView {
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
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async ensureSeedUsers() {
    const seedUsers: CreateUserInput[] = [
      {
        username: "presales_demo",
        displayName: "示例售前工程师",
        email: "presales_demo@example.com",
        password: "Presales@123",
        role: "pre_sales_engineer",
        isActive: true,
        mainIndustry: ["金融行业"],
        teamRole: "解决方案负责人",
      },
      {
        username: "manager_demo",
        displayName: "示例经理",
        email: "manager_demo@example.com",
        password: "Manager@123",
        role: "manager",
        isActive: true,
        mainIndustry: ["制造行业"],
        teamRole: "团队经理",
      },
      {
        username: "admin_demo",
        displayName: "示例管理员",
        email: "admin_demo@example.com",
        password: "Admin@123",
        role: "admin",
        isActive: true,
        mainIndustry: ["平台管理"],
        teamRole: "系统管理员",
      },
      {
        username: "sales_demo",
        displayName: "示例销售",
        email: "sales_demo@example.com",
        password: "Sales@123",
        role: "sales",
        isActive: true,
        mainIndustry: ["园区行业"],
        teamRole: "销售负责人",
      },
      {
        username: "zhangsan_sales",
        displayName: "张三",
        email: "zhangsan_sales@example.com",
        password: "Sales@123",
        role: "sales",
        isActive: true,
        mainIndustry: ["金融行业"],
        teamRole: "金融行业负责人",
      },
      {
        username: "lisi_sales",
        displayName: "李四",
        email: "lisi_sales@example.com",
        password: "Sales@123",
        role: "sales",
        isActive: true,
        mainIndustry: ["制造行业"],
        teamRole: "制造行业销售",
      },
      {
        username: "wangwu_sales",
        displayName: "王五",
        email: "wangwu_sales@example.com",
        password: "Sales@123",
        role: "sales",
        isActive: true,
        mainIndustry: ["电商行业"],
        teamRole: "电商行业负责人",
      },
      {
        username: "zhaoliu_sales",
        displayName: "赵六",
        email: "zhaoliu_sales@example.com",
        password: "Sales@123",
        role: "sales",
        isActive: true,
        mainIndustry: ["园区行业"],
        teamRole: "园区行业负责人",
      },
      {
        username: "other_user",
        displayName: "其他售前",
        email: "other_user@example.com",
        password: "Presales@123",
        role: "pre_sales_engineer",
        isActive: true,
        mainIndustry: ["轨交行业"],
        teamRole: "行业售前顾问",
      },
      {
        username: "guest_demo",
        displayName: "示例访客",
        email: "guest_demo@example.com",
        password: "Guest@123",
        role: "guest",
        isActive: true,
        mainIndustry: ["访客体验"],
        teamRole: "访客账号",
      },
    ];

    for (const user of seedUsers) {
      const existingUser = await this.findByUsernameOrEmail(user.username);
      if (existingUser) {
        continue;
      }
      await this.create(user);
    }
  }

  async create(input: CreateUserInput) {
    const username = input.username.trim();
    const email = input.email.trim().toLowerCase();

    if (!username || !email || !input.password) {
      throw new BadRequestException("用户名、邮箱和密码不能为空");
    }

    if (!isUserRole(input.role || "pre_sales_engineer")) {
      throw new BadRequestException("角色不合法");
    }

    await this.assertUniqueUser(username, email);

    const user = this.userRepository.create({
      username,
      email,
      displayName: input.displayName?.trim() || username,
      passwordHash: await hashPassword(input.password),
      role: input.role || "pre_sales_engineer",
      isActive: input.isActive ?? true,
      mainIndustry: input.mainIndustry?.filter(Boolean) || [],
      teamRole: input.teamRole?.trim() || null,
    });

    const saved = await this.userRepository.save(user);
    return this.toUserView(saved);
  }

  async findAll(query: ListUsersQuery = {}) {
    const qb = this.userRepository.createQueryBuilder("user");

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim().toLowerCase()}%`;
      qb.andWhere(
        "LOWER(user.username) LIKE :keyword OR LOWER(COALESCE(user.displayName, '')) LIKE :keyword OR LOWER(COALESCE(user.email, '')) LIKE :keyword OR LOWER(COALESCE(user.teamRole, '')) LIKE :keyword OR LOWER(COALESCE(user.mainIndustry, '')) LIKE :keyword",
        { keyword },
      );
    }

    if (query.role && isUserRole(query.role)) {
      qb.andWhere("user.role = :role", { role: query.role });
    }

    if (query.status === "active") {
      qb.andWhere("user.isActive = true");
    } else if (query.status === "inactive") {
      qb.andWhere("user.isActive = false");
    }

    qb.orderBy("user.updatedAt", "DESC");

    const users = await qb.getMany();
    return users.map((user) => this.toUserView(user));
  }

  async findById(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    return user;
  }

  async findViewById(id: number) {
    return this.toUserView(await this.findById(id));
  }

  async findByUsernameOrEmail(identifier: string) {
    const normalized = identifier.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    return this.userRepository
      .createQueryBuilder("user")
      .where("LOWER(user.username) = :normalized", { normalized })
      .orWhere("LOWER(user.email) = :normalized", { normalized })
      .getOne();
  }

  async update(id: number, input: UpdateUserInput) {
    const user = await this.findById(id);

    if (input.email && input.email.trim().toLowerCase() !== (user.email || "").toLowerCase()) {
      const existingByEmail = await this.userRepository
        .createQueryBuilder("user")
        .where("LOWER(user.email) = :email", {
          email: input.email.trim().toLowerCase(),
        })
        .andWhere("user.id != :id", { id })
        .getOne();
      if (existingByEmail) {
        throw new BadRequestException("邮箱已被占用");
      }
      user.email = input.email.trim().toLowerCase();
    }

    if (input.displayName !== undefined) {
      user.displayName = input.displayName.trim() || user.username;
    }

    if (input.password) {
      user.passwordHash = await hashPassword(input.password);
    }

    if (input.role) {
      if (!isUserRole(input.role)) {
        throw new BadRequestException("角色不合法");
      }
      user.role = input.role;
    }

    if (typeof input.isActive === "boolean") {
      user.isActive = input.isActive;
    }

    if (input.mainIndustry) {
      user.mainIndustry = input.mainIndustry.filter(Boolean);
    }

    if (input.teamRole !== undefined) {
      user.teamRole = input.teamRole.trim() || null;
    }

    const saved = await this.userRepository.save(user);
    return this.toUserView(saved);
  }

  async updateCurrentUser(id: number, input: UpdateCurrentUserInput) {
    const user = await this.findById(id);

    if (input.email && input.email.trim().toLowerCase() !== (user.email || "").toLowerCase()) {
      const normalizedEmail = input.email.trim().toLowerCase();
      const existingByEmail = await this.userRepository
        .createQueryBuilder("user")
        .where("LOWER(user.email) = :email", {
          email: normalizedEmail,
        })
        .andWhere("user.id != :id", { id })
        .getOne();
      if (existingByEmail) {
        throw new BadRequestException("邮箱已被占用");
      }
      user.email = normalizedEmail;
    }

    if (input.displayName !== undefined) {
      user.displayName = input.displayName.trim() || user.username;
    }

    if (input.mainIndustry !== undefined) {
      user.mainIndustry = input.mainIndustry.filter(Boolean);
    }

    if (input.teamRole !== undefined) {
      user.teamRole = input.teamRole.trim() || null;
    }

    const saved = await this.userRepository.save(user);
    return this.toUserView(saved);
  }

  async changeCurrentUserPassword(
    id: number,
    input: ChangeCurrentUserPasswordInput,
  ) {
    const user = await this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id })
      .getOne();

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    const currentPassword = input.currentPassword?.trim();
    const newPassword = input.newPassword?.trim();
    const confirmPassword = input.confirmPassword?.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new BadRequestException("当前密码、新密码和确认新密码不能为空");
    }

    if (newPassword.length < 8) {
      throw new BadRequestException("新密码长度不能少于 8 位");
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException("两次输入的新密码不一致");
    }

    const isCurrentPasswordValid = await verifyPassword(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException("当前密码不正确");
    }

    user.passwordHash = await hashPassword(newPassword);
    await this.userRepository.save(user);
    return { success: true };
  }

  async getMenuPermissionDefinitions() {
    return MENU_PERMISSION_DEFINITIONS;
  }

  async getActionPermissionDefinitions() {
    return ACTION_PERMISSION_DEFINITIONS;
  }

  async getUserMenuPermissions(id: number) {
    const user = await this.findById(id);
    const roleMenuKeys = getRoleMenuKeys(user.role);
    const allowedMenuKeys = user.allowedMenuKeys || [];
    const deniedMenuKeys = user.deniedMenuKeys || [];
    const effectiveMenuKeys = getEffectiveMenuKeys(
      user.role,
      allowedMenuKeys,
      deniedMenuKeys,
    );

    return {
      user: this.toUserView(user),
      roleMenuKeys,
      allowedMenuKeys,
      deniedMenuKeys,
      effectiveMenuKeys,
      definitions: MENU_PERMISSION_DEFINITIONS,
    };
  }

  async updateUserMenuPermissions(
    id: number,
    input: { allowedMenuKeys?: string[]; deniedMenuKeys?: string[] },
  ) {
    const user = await this.findById(id);
    const validKeys = new Set(MENU_PERMISSION_DEFINITIONS.map((item) => item.key));
    user.allowedMenuKeys = (input.allowedMenuKeys || []).filter((item) =>
      validKeys.has(item),
    );
    user.deniedMenuKeys = (input.deniedMenuKeys || []).filter((item) =>
      validKeys.has(item),
    );
    await this.userRepository.save(user);
    return this.getUserMenuPermissions(id);
  }

  async resetUserMenuPermissions(id: number) {
    const user = await this.findById(id);
    user.allowedMenuKeys = [];
    user.deniedMenuKeys = [];
    await this.userRepository.save(user);
    return this.getUserMenuPermissions(id);
  }

  async getUserActionPermissions(id: number) {
    const user = await this.findById(id);
    const roleActionKeys = getRoleActionKeys(user.role);
    const allowedActionKeys = user.allowedActionKeys || [];
    const deniedActionKeys = user.deniedActionKeys || [];
    const effectiveActionKeys = getEffectiveActionKeys(
      user.role,
      allowedActionKeys,
      deniedActionKeys,
    );

    return {
      user: this.toUserView(user),
      roleActionKeys,
      allowedActionKeys,
      deniedActionKeys,
      effectiveActionKeys,
      definitions: ACTION_PERMISSION_DEFINITIONS,
    };
  }

  async updateUserActionPermissions(
    id: number,
    input: { allowedActionKeys?: string[]; deniedActionKeys?: string[] },
  ) {
    const user = await this.findById(id);
    const validKeys = new Set(
      ACTION_PERMISSION_DEFINITIONS.map((item) => item.key),
    );
    user.allowedActionKeys = (input.allowedActionKeys || []).filter((item) =>
      validKeys.has(item),
    );
    user.deniedActionKeys = (input.deniedActionKeys || []).filter((item) =>
      validKeys.has(item),
    );
    await this.userRepository.save(user);
    return this.getUserActionPermissions(id);
  }

  async resetUserActionPermissions(id: number) {
    const user = await this.findById(id);
    user.allowedActionKeys = [];
    user.deniedActionKeys = [];
    await this.userRepository.save(user);
    return this.getUserActionPermissions(id);
  }

  async remove(id: number) {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
    return { success: true };
  }

  async touchLastLogin(id: number) {
    const user = await this.findById(id);
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);
  }

  toUserView(user: User): UserView {
    const permissionProfile = getPermissionProfile(user.role);
    const effectiveMenuKeys = getEffectiveMenuKeys(
      user.role,
      user.allowedMenuKeys || [],
      user.deniedMenuKeys || [],
    );
    const effectiveActionKeys = getEffectiveActionKeys(
      user.role,
      user.allowedActionKeys || [],
      user.deniedActionKeys || [],
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
      allowedMenuKeys: user.allowedMenuKeys || [],
      deniedMenuKeys: user.deniedMenuKeys || [],
      effectiveMenuKeys,
      roleActionKeys: getRoleActionKeys(user.role),
      allowedActionKeys: user.allowedActionKeys || [],
      deniedActionKeys: user.deniedActionKeys || [],
      effectiveActionKeys,
      isActive: user.isActive,
      mainIndustry: user.mainIndustry || [],
      teamRole: user.teamRole || undefined,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    };
  }

  private async assertUniqueUser(username: string, email: string) {
    const existing = await this.userRepository
      .createQueryBuilder("user")
      .where("LOWER(user.username) = :username", {
        username: username.toLowerCase(),
      })
      .orWhere("LOWER(user.email) = :email", { email })
      .getOne();

    if (existing) {
      throw new BadRequestException("用户名或邮箱已存在");
    }
  }
}
