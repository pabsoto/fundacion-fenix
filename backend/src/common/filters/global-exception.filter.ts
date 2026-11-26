import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GoogleAuthError } from '../../modules/auth/oauth/google-auth.errors.js';
import { ErrorResponseDto } from '../dto/error-response.dto.js';
import { trazaDeError } from '../utils/traza-error.js';

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

    // Se omite la cadena de consulta: puede contener códigos de
    // autorización u otros datos sensibles que no deben devolverse.
    const path = request.originalUrl.split('?')[0];

    this.registrar(exception, statusCode, request.method, path);

    const body: ErrorResponseDto = {
      statusCode,
      error: details.error,
      message: details.message,
      timestamp: new Date().toISOString(),
      path,
    };

    response.status(statusCode).json(body);
  }

  /**
   * Los 5xx se registran como error, con el stack y sus causas; los 4xx, como
   * advertencia y sin stack ni mensaje, que pueden repetir datos recibidos.
   * El id de la petición lo añade el logger.
   */
  private registrar(
    exception: unknown,
    statusCode: number,
    metodo: string,
    ruta: string,
  ): void {
    const datos = {
      evento: 'error_http',
      statusCode,
      metodo,
      ruta,
      error: exception instanceof Error ? exception.name : typeof exception,
      ...(exception instanceof GoogleAuthError
        ? { codigo: exception.codigo }
        : {}),
    };

    if (statusCode >= 500) {
      this.logger.error(
        { ...datos, stack: trazaDeError(exception) },
        'Error del servidor',
      );
      return;
    }

    this.logger.warn(datos, 'Petición rechazada');
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
