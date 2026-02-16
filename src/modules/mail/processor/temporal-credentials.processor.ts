import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../service';

@Processor('temporal-credentials')
export class TemporalCredentialsProcessor extends WorkerHost {
  private readonly logger = new Logger(TemporalCredentialsProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    this.logger.log(`Processing mail job ${job.id} for ${job.data.to}`);

    try {
      await this.mailService.sendTemporalCredentials({
        to: job.data.to,
        email: job.data.email,
        password: job.data.password,
      });

      this.logger.log(`Temporal credentials mail sent successfully to ${job.data.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send temporal credentials mail to ${job.data.to}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
