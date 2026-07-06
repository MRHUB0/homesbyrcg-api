const severity = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  constructor({ level = 'info', serviceName, environment, baseContext = {} }) {
    this.level = level;
    this.serviceName = serviceName;
    this.environment = environment;
    this.baseContext = baseContext;
  }

  child(context = {}) {
    return new Logger({
      level: this.level,
      serviceName: this.serviceName,
      environment: this.environment,
      baseContext: { ...this.baseContext, ...context },
    });
  }

  debug(message, fields = {}) {
    this.write('debug', message, fields);
  }

  info(message, fields = {}) {
    this.write('info', message, fields);
  }

  warn(message, fields = {}) {
    this.write('warn', message, fields);
  }

  error(message, fields = {}) {
    this.write('error', message, fields);
  }

  write(level, message, fields) {
    if (severity[level] < severity[this.level]) {
      return;
    }

    const record = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.serviceName,
      environment: this.environment,
      ...this.baseContext,
      ...fields,
    };

    console.log(JSON.stringify(record));
  }
}
