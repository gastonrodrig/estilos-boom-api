import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl } = request;

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          const httpResponse = context.switchToHttp().getResponse();
          const { statusCode } = httpResponse;
          const duration = Date.now() - start;
          const responseSummary =
            response && typeof response === 'object'
              ? Object.keys(response).slice(0, 3).join(',')
              : '';

          this.logger.log(
            `[${statusCode}] ${method} ${originalUrl} - ${duration}ms${responseSummary ? ` | ${responseSummary}` : ''}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(
            `[${error?.status || 500}] ${method} ${originalUrl} - ${duration}ms | ${error?.message || 'Unhandled error'}`,
          );
        },
      }),
    );
  }
}
