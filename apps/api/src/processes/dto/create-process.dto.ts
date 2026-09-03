import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProcessDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  identifier?: string;
}
