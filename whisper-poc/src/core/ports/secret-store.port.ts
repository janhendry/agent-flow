export interface SecretStorePort {
	getApiKey(): string | undefined;
	setApiKey(apiKey: string): void;
	clearApiKey(): void;
	providerName(): string;
}
