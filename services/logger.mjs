import 'dotenv/config';

// Import the official Google Cloud Logging library using ES6 syntax.
import { Logging } from '@google-cloud/logging';

class DiscordLogger {
    /**
     * The constructor is responsible for initializing the Google Cloud
     * Logging client and setting up a specific logger instance.
     * This should only be called ONCE in the application's lifecycle.
     * It reads configuration from environment variables.
     * @param {string} logName - The name of the log to write to. Defaults to process.env.LOG_NAME.
     * @param {string} projectId - Your Google Cloud project ID. Defaults to process.env.GCP_PROJECT_ID.
     */
    constructor(logName = process.env.LOG_NAME, projectId = process.env.GCP_PROJECT_ID) {
        this.useCloudLogging = false;
        this.logName = logName || 'default-log';
        this.projectId = projectId;

        if (!projectId) {
            console.error("🚨 GCP_PROJECT_ID is not set in your environment variables. Please check your .env file.");
            console.log("📝 Falling back to console logging only.");
            return;
        }
        if (!logName) {
            console.warn("⚠️ LOG_NAME not set in environment, defaulting to 'default-log'.");
        }

        try {
            const logging = new Logging({ projectId });
            this.log = logging.log(this.logName);
            this.useCloudLogging = true;
            console.log(`☁️  DiscordLogger initialized for log "${this.logName}" in project "${projectId}". Ready to receive logs.`);
        } catch (error) {
            console.warn("⚠️  Failed to initialize Google Cloud Logging:", error.message);
            console.log("📝 Falling back to console logging only.");
            console.log("💡 To enable Google Cloud Logging, set up Application Default Credentials:");
            console.log("   gcloud auth application-default login");
            this.useCloudLogging = false;
        }
    }

    /**
     * Writes a log entry with a specific severity.
     * @private
     * @param {string} severity - The severity of the log entry (e.g., 'INFO', 'WARNING', 'ERROR').
     * @param {string} message - The primary log message.
     * @param {object} [metadata={}] - An optional object containing structured data.
     */
    async _writeLog(severity, message, metadata = {}) {
        if (!message) {
            console.error(`Log message for severity ${severity} cannot be empty.`);
            return;
        }

        // Always log to console for local development
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            severity,
            message,
            ...metadata
        };
        
        // Use appropriate console method based on severity
        switch (severity) {
            case 'ERROR':
                console.error(`[${timestamp}] ${severity}: ${message}`, metadata);
                break;
            case 'WARNING':
                console.warn(`[${timestamp}] ${severity}: ${message}`, metadata);
                break;
            default:
                console.log(`[${timestamp}] ${severity}: ${message}`, metadata);
        }

        // Try to log to Google Cloud if available
        if (this.useCloudLogging && this.log) {
            try {
                const entry = this.log.entry({
                    severity,
                    jsonPayload: { message, ...metadata },
                });
                await this.log.write(entry);
            } catch (error) {
                console.error(`Failed to write ${severity} log to Google Cloud:`, error.message);
                // Don't throw the error to avoid breaking the application
            }
        }
    }

    /**
     * Writes an INFO severity log entry.
     * @param {string} message - The primary log message.
     * @param {object} [metadata={}] - Optional structured data.
     */
    async info(message, metadata = {}) {
        await this._writeLog('INFO', message, metadata);
    }

    /**
     * Writes a WARNING severity log entry.
     * @param {string} message - The primary log message.
     * @param {object} [metadata={}] - Optional structured data.
     */
    async warn(message, metadata = {}) {
        await this._writeLog('WARNING', message, metadata);
    }

    /**
     * Writes an ERROR severity log entry.
     * @param {string} message - The primary log message.
     * @param {object} [metadata={}] - Optional structured data. Can include error stack, request ID, etc.
     */
    async error(message, metadata = {}) {
        await this._writeLog('ERROR', message, metadata);
    }
}

/*
 * =================================================================
 * Singleton Instance Export
 * =================================================================
 */
const loggerInstance = new DiscordLogger();
export default loggerInstance; 