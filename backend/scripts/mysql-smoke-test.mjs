const apiBaseUrl = (
  process.env.API_BASE_URL ||
  process.env.SMOKE_API_BASE_URL ||
  "http://127.0.0.1/api"
).replace(/\/+$/, "");

const adminUsername = process.env.SMOKE_ADMIN_USERNAME || "admin_demo";
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || "Admin@123";

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `${options.method || "GET"} ${path} failed: ${response.status} ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

async function main() {
  const suffix = Date.now();
  const tempUser = {
    username: `smoke_user_${suffix}`,
    displayName: `MySQL烟测用户${suffix}`,
    email: `smoke_user_${suffix}@example.com`,
    password: "SmokeTest@123",
    role: "sales",
    isActive: true,
    mainIndustry: ["平台管理", "烟测行业"],
    teamRole: "销售负责人",
  };
  let adminHeaders = null;
  let createdUserId = null;
  let usersBefore = [];

  try {
    console.log(`[1/8] 登录管理员 ${adminUsername}`);
    const adminLogin = await login(adminUsername, adminPassword);
    assertOk(adminLogin?.accessToken, "管理员登录未返回 accessToken");
    adminHeaders = {
      Authorization: `Bearer ${adminLogin.accessToken}`,
    };

    console.log("[2/8] 校验 /auth/me");
    const authMe = await request("/auth/me", {
      headers: adminHeaders,
    });
    assertOk(authMe?.username === adminUsername, "auth/me 返回的管理员账号不匹配");

    console.log("[3/8] 读取成员列表");
    usersBefore = await request("/users", {
      headers: adminHeaders,
    });
    assertOk(Array.isArray(usersBefore), "成员列表接口未返回数组");

    console.log("[4/8] 创建临时用户");
    const createdUser = await request("/users", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(tempUser),
    });
    assertOk(createdUser?.id, "创建用户未返回 id");
    createdUserId = createdUser.id;

    console.log("[5/8] 更新临时用户");
    const updatedUser = await request(`/users/${createdUser.id}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        displayName: `${tempUser.displayName}-已更新`,
        mainIndustry: ["平台管理", "已更新行业"],
        teamRole: "团队经理",
        isActive: true,
      }),
    });
    assertOk(updatedUser?.teamRole === "团队经理", "更新后的团队角色不符合预期");
    assertOk(updatedUser?.isActive === true, "更新后的状态不符合预期");

    console.log("[6/8] 使用新用户登录并校验当前用户接口");
    const tempLogin = await login(tempUser.username, tempUser.password);
    assertOk(tempLogin?.accessToken, "临时用户登录失败");
    const tempMe = await request("/users/me", {
      headers: {
        Authorization: `Bearer ${tempLogin.accessToken}`,
      },
    });
    assertOk(tempMe?.username === tempUser.username, "users/me 返回的新用户账号不匹配");
    assertOk(tempMe?.teamRole === "团队经理", "users/me 未返回最新团队角色");

    console.log("[7/8] 关键字检索创建数据");
    const searchedUsers = await request(
      `/users?keyword=${encodeURIComponent(tempUser.username)}`,
      {
        headers: adminHeaders,
      },
    );
    assertOk(
      Array.isArray(searchedUsers) &&
        searchedUsers.some((item) => item.username === tempUser.username),
      "关键字检索未命中新建用户",
    );

    console.log("[8/8] 删除临时用户并完成清理");
    await request(`/users/${createdUser.id}`, {
      method: "DELETE",
      headers: adminHeaders,
    });
    createdUserId = null;

    console.log("MySQL smoke test passed");
    console.log(
      JSON.stringify(
        {
          apiBaseUrl,
          adminUsername,
          initialUserCount: usersBefore.length,
        },
        null,
        2,
      ),
    );
  } finally {
    if (adminHeaders && createdUserId) {
      try {
        await request(`/users/${createdUserId}`, {
          method: "DELETE",
          headers: adminHeaders,
        });
        console.log(`cleanup: deleted temporary user ${createdUserId}`);
      } catch (cleanupError) {
        console.error(`cleanup failed for temporary user ${createdUserId}`);
        console.error(
          cleanupError instanceof Error ? cleanupError.message : cleanupError,
        );
      }
    }
  }
}

main().catch((error) => {
  console.error("MySQL smoke test failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
