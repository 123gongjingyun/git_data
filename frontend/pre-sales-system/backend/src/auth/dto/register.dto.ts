import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'testuser' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'test@example.com' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(6, { message: '密码至少6位' })
  password: string;

  @ApiProperty({ description: '真实姓名', example: '张三', required: false })
  @IsString()
  realName?: string;
}
