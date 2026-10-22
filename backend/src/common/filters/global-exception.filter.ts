import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = this.getDetails(exception, statusCode);

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Error no controlado',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseDto = {
      statusCode,
      error: details.error,
      message: details.message,
      timestamp: new Date().toISOString(),
      // Se omite la cadena de consulta: puede contener códigos de
      // autorización u otros datos sensibles que no deben devolverse.
      path: request.originalUrl.split('?')[0],
    };

    response.status(statusCode).json(body);
  }

  private getDetails(
    exception: unknown,
    statusCode: number,
  ): Pick<ErrorResponseDto, 'error' | 'message'> {
    if (!(exception instanceof HttpException)) {
      return {
        error: 'Internal Server Error',
        message: 'Ocurrió un error interno',
      };
    }

    const payload: unknown = exception.getResponse();
    if (typeof payload === 'string') {
      return { error: exception.name, message: payload };
    }

    if (typeof payload === 'object' && payload !== null) {
      const record = payload as Record<string, unknown>;
      const message = record.message;
      const error = record.error;

      return {
        error: typeof error === 'string' ? error : exception.name,
        message:
          typeof message === 'string' ||
          (Array.isArray(message) &&
            message.every((item) => typeof item === 'string'))
            ? message
            : exception.message,
      };
    }

    return {
      error: HttpStatus[statusCode] ?? exception.name,
      message: exception.message,
    };
  }
}
