import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  CreateWorkflowDefinitionDto,
  ListWorkflowDefinitionsQuery,
  UpdateWorkflowDefinitionDto,
  WorkflowsService,
} from "./workflows.service";

@UseGuards(AuthGuard("jwt"))
@Controller("workflow-definitions")
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  findAll(@Query() query: ListWorkflowDefinitionsQuery) {
    return this.workflowsService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.workflowsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateWorkflowDefinitionDto) {
    return this.workflowsService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateWorkflowDefinitionDto,
  ) {
    return this.workflowsService.update(id, dto);
  }

  @Post(":id/set-default")
  setDefault(@Param("id", ParseIntPipe) id: number) {
    return this.workflowsService.setDefault(id);
  }

  @Post(":id/enable")
  enable(@Param("id", ParseIntPipe) id: number) {
    return this.workflowsService.setEnabled(id, true);
  }

  @Post(":id/disable")
  disable(@Param("id", ParseIntPipe) id: number) {
    return this.workflowsService.setEnabled(id, false);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.workflowsService.remove(id);
  }
}
