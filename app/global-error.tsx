"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        Sentry.captureException(error);

        // Show the Sentry User Feedback form when an error occurs
        const feedback = Sentry.getFeedback();
        if (feedback) {
            void (async () => {
                const form = await feedback.createForm();
                form.appendToDom();
                form.open();
            })();
        }
    }, [error]);

    return (
        <html>
            <body>
                {/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
                <NextError statusCode={0} />
            </body>
        </html>
    );
}
