"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { login } from "./actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fadeInUp, transitionFast } from "@/lib/motion";

export function LoginForm({ error }: { error?: string }) {
  return (
    <motion.form
      action={login}
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="w-full max-w-sm space-y-5"
    >
      <div>
        <h1 className="font-display text-heading-lg text-neutral-900">Sign in</h1>
        <p className="mt-1 text-body-sm text-neutral-500">Use your admin account to continue.</p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={transitionFast}
            className="flex items-start gap-2 overflow-hidden rounded-sm bg-danger-50 px-3 py-2.5 text-body-sm text-danger-600"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-body-sm font-medium text-neutral-700">
          Email
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-body-sm font-medium text-neutral-700">
          Password
        </label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>

      <Button type="submit" className="w-full" size="md">
        Sign in
      </Button>
    </motion.form>
  );
}
