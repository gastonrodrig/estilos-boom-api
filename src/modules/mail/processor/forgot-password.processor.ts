import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../service';

@Processor('forgot-password')
export class ForgotPasswordProcessor extends WorkerHost {
	private readonly logger = new Logger(ForgotPasswordProcessor.name);

	constructor(private readonly mailService: MailService) {
		super();
	}

	async process(job: Job<any>): Promise<void> {
		this.logger.log(`Processing forgot password mail job ${job.id} for ${job.data.to}`);

		try {
			await this.mailService.sendPasswordResetLink({
				to: job.data.to,
				link: job.data.link,
			});
			this.logger.log(`Password reset mail sent successfully to ${job.data.to}`);
		} catch (error) {
			this.logger.error(
				`Failed to send password reset mail to ${job.data.to}: ${error.message}`,
				error.stack,
			);
			throw error;
		}
	}
}