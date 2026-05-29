// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo
// SQL is inlined as strings to avoid Metro asset import issues with .sql files.

const journal = {
  version: '7',
  dialect: 'sqlite',
  entries: [
    {
      idx: 0,
      version: '6',
      when: 1779964956655,
      tag: '0000_curly_blob',
      breakpoints: true,
    },
  ],
};

const m0000 = `CREATE TABLE \`activities\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`name\` text NOT NULL,
\t\`emoji\` text NOT NULL,
\t\`color\` text NOT NULL,
\t\`scheduled_days_mask\` integer DEFAULT 0 NOT NULL,
\t\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
\t\`archived\` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`completions\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`activity_id\` integer NOT NULL,
\t\`date\` text NOT NULL,
\t\`completed_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
\tFOREIGN KEY (\`activity_id\`) REFERENCES \`activities\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`uniq_completion_activity_date\` ON \`completions\` (\`activity_id\`,\`date\`);--> statement-breakpoint
CREATE INDEX \`completion_date_idx\` ON \`completions\` (\`date\`);`;

export default {
  journal,
  migrations: {
    m0000,
  },
};
