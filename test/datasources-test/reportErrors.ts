import { createTransport, SendMailOptions } from "nodemailer";

interface ISendOptions {
    from: string; // sender address
    html?: string; // html body
    subject: string; // Subject line
    text: string; // plain text body
    to: string; // list of receivers
}

const log = {
    info: console.info,
    error: console.error,
    warn: console.warn,
};

const config = {
    mail_enable: process.env.MAILER_ENABLE === "true" || false,
    mail_from: process.env.MAILER_FROM,
    mail_password: process.env.MAILER_PASSWORD,
    mail_port: process.env.MAILER_PORT,
    mail_receiver: process.env.MAILER_RECEIVER || "",
    mail_service: process.env.MAILER_HOST,
    mail_username: process.env.MAILER_USERNAME,
};

const transporter = createTransport({
    auth: {
        pass: config.mail_password,
        user: config.mail_username,
    },
    host: config.mail_service,
    port: config.mail_port,
} as SendMailOptions);

const failures: Array<string | undefined> = [];
const successes: Array<string | undefined> = [];

afterEach(function () {
    const title = this.currentTest?.fullTitle();
    const state = this.currentTest?.state;
    if (state === "passed") {
        successes.push(title);
    } else if (state === "failed") {
        failures.push(title);
    }
});

after(async function () {
    const data = JSON.stringify({ failures, successes }, null, 4);
    log.info(data);

    if (failures.length > 0 && config.mail_enable) {
        await send({
            to: config.mail_receiver,
            subject: "Golemio Integration Engine - datasources test reporting",
            text: data,
            html: "",
            from: config.mail_from || `<${config.mail_username}>`,
        });
    }
});

// to, subject, text = "", html = "", from = "no-replay@operatorict.cz"
const send = async (opts: ISendOptions): Promise<void> => {
    // options validation
    if (!opts.to || opts.to === "" || !opts.subject || opts.subject === "" || !opts.from || opts.from === "") {
        throw new Error("Mandatory options must be set.");
    }

    // Setup email data with unicode symbols
    const mailOptions = {
        from: opts.from, // sender address
        html: opts.html, // html body
        subject: opts.subject, // Subject line
        text: opts.text, // plain text body
        to: opts.to, // list of receivers
    };

    // Send mail with defined transport object
    log.info("Sending email...");
    const info = await transporter.sendMail(mailOptions);
    log.info("Message %s sent: %s", info.messageId, info.response);
};
