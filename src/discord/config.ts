import dotenv from 'dotenv';

dotenv.config();

interface DiscordConfig {
  token: string;
  prefix: string;
};

export const discordConfig: DiscordConfig = {
  token: process.env.DISCORD_TOKEN,
  prefix: process.env.DISCORD_PREFIX
};
