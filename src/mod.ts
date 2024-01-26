// Enums
enum BlockChain {
    BSC = 'BSC',
    ETH = 'ETH',
    MATIC = 'MATIC',
    TRON = 'TRON',
}

enum Cryptocurrency {
    ETH = 'ETH',
    ETH_USDC = 'ETH_USDC',
    ETH_USDT = 'ETH_USDT',
    MATIC = 'MATIC',
    MATIC_USDC = 'MATIC_USDC',
    MATIC_USDT = 'MATIC_USDT',
    BNB = 'BNB',
    BSC_USDT = 'BSC_USDT',
    TRON = 'TRON',
    TRON_USDT = 'TRON_USDT',
}

enum FiatCurrency {
    EUR = 'EUR',
    USD = 'USD',
}

enum Status {
    failed = 'failed',
    inProgress = 'inProgress',
    success = 'success',
    pending = 'pending',
}

enum Version {
    V1 = 'v1',
}

// Interfaces
interface Payment {
    currency: FiatCurrency;
    description: string;
    id: string;
    isLocked: boolean;
    merchantName: string;
    paymentInfo: null | PaymentInfo;
    paymentMethod: null | PaymentMethod;
    price: number;
}

interface PaymentCreation {
    id?: string;
    currency: FiatCurrency;
    description: string;
    isTest?: boolean;
    orderId?: string;
    price: number;
    redirectUrl: string;
}

interface PaymentCreated {
    id: string;
    currency: FiatCurrency;
    createdAt: string;
    description: string;
    isTest: boolean;
    orderId: string | null;
    paymentUrl: string;
    price: number;
    redirectUrl: string;
    status: Status;
    type: 'payment';
}

interface PaymentCustomer {
    email: string;
}

interface ConvertCurrency {
    cryptoCurrency: Cryptocurrency;
    fiatCurrency: FiatCurrency;
    fiatAmount: number;
}

interface CurrencyConverted {
    cryptoAmount: string | number;
    cryptoCurrency: Cryptocurrency;
    displayName: string;
    exchangeRate: number;
    fiatAmount: number;
    fiatCurrency: FiatCurrency;
    network: string;
}

interface PaymentInfo {
    amount: string | number;
    amountFormatted: string | number;
    expirationDurationMin: number;
    expiresAt: string;
    paymentLink: string;
    recipientAddress: string;
    status: Status;
}

interface PaymentMethod {
    blockchain: BlockChain;
    blockchainName: string;
    displayName: string;
    isTest: boolean;
    name: Cryptocurrency;
    networkId: string;
    ticker: Cryptocurrency;
}

interface SupportedMethod {
    blockchain: BlockChain;
    blockchainName: string;
    displayName: string;
    name: FiatCurrency;
    ticker: string;
}

interface SupportedMethods {
    availableMethods: SupportedMethod[];
}

interface Webhook {
    id: string;
    customerEmail: string;
    isTest: boolean;
    paymentLinkId: string;
    selectedBlockchain: BlockChain;
    selectedCurrency: FiatCurrency;
    status: Status,
}

// Main Client Class
// @deno-types="@types/crypto-js"
import * as CryptoJS from 'crypto-js'

// @deno-types="@types/uuid"
import { v4 } from 'uuid'

interface Config {
    merchantId: string;
    token: string;
    version?: Version;
}

class Client {
    protected readonly BASE_URL = 'https://api.o2pay.co/api';

    protected readonly merchantId: string;
    protected readonly token: string;
    protected readonly version: Version;

    constructor(config: Config) {
        this.merchantId = config.merchantId;
        this.token = config.token;
        this.version = config.version || Version.V1;
    }

    protected async fetchData(url: string, method: string, body?: object): Promise<Response> {
        const headers = {
            'Application': 'application/json',
            'Content-Type': 'application/json',
            'X-O2PAY-TOKEN': this.token,
        };

        const options: RequestInit = {
            method, headers, body: body ? JSON.stringify(body) : undefined,
        };

        return await fetch(url, options);
    }

    public getPaymentUrl(path: string): string {
        return `${this.BASE_URL}${path}`;
    }

    public async createPayment(payment: PaymentCreation): Promise<PaymentCreated> {
        const paymentURL = this.getPaymentUrl(`/merchant/${this.version}/merchant/${this.merchantId}/payment`);
        payment.id = payment.id || v4();

        const response = await this.fetchData(paymentURL, 'POST', payment);

        return response.json();
    }

    public async createSession(): Promise<Session> {
        const session = new Session(this as unknown as Config);
        await session.init()

        return session
    }

    public async getPayment(id: string): Promise<Payment> {
        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/payment/${id}`);
        const response = await this.fetchData(paymentURL, 'GET');

        return response.json();
    }

    public validateWebhook(requestBody: string, secret: string, signature: string): boolean {
        const hmac = CryptoJS.HmacSHA512(requestBody, secret);
        const expectedMAC = CryptoJS.enc.Base64.stringify(hmac);

        return expectedMAC === signature;
    }
}

// Session Class
class Session extends Client {
    private cookie: string | null = null;
    private csrf: string | null = null;
    private requestId: string | null = null;

    constructor(config: Config) {
        super(config);
    }

    private checkInitialization() {
        if (!this.cookie || !this.csrf || !this.requestId) {
            throw new Error('Not initialized');
        }
    }

    protected async fetchData(url: string, method: string, body?: object): Promise<Response> {
        const headers = {
            'Application': 'application/json',
            'Cookie': this.cookie!,
            'Content-Type': 'application/json',
            'X-Csrf-Token': this.csrf!,
            'X-Request-Id': this.requestId!
        };

        const options: RequestInit = {
            method, headers, body: body ? JSON.stringify(body) : undefined,
        };

        return await fetch(url, options);
    }

    public async init() {
        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/csrf-cookie`);
        const response = await this.fetchData(paymentURL, 'GET');

        this.cookie = response.headers.get('Set-Cookie');
        this.csrf = response.headers.get('X-Csrf-Token');
        this.requestId = response.headers.get('X-Request-Id');
    }

    public async convertCurrency(convert: ConvertCurrency): Promise<CurrencyConverted> {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(
            `/payment/${this.version}/currency-convert?` +
            `fiatCurrency=${convert.fiatCurrency}&` +
            `fiatAmount=${convert.fiatAmount}&` +
            `cryptoCurrency=${convert.cryptoCurrency}`
        );

        const response = await this.fetchData(paymentURL, 'GET');
        return response.json();
    }

    public async getPaymentMethods(id: string): Promise<SupportedMethods> {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/payment/${id}/supported-method`);
        const response = await this.fetchData(paymentURL, 'GET');

        return response.json();
    }

    public async updatePaymentMethod(id: string, method: SupportedMethod) {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/payment/${id}/method`);
        const response = await this.fetchData(paymentURL, 'POST', method);

        return response.json();
    }

    public async updatePaymentCustomer(id: string, customer: PaymentCustomer) {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/payment/${id}/customer`);
        const response = await this.fetchData(paymentURL, 'POST', customer);

        return response.json();
    }

    public async updatePayment(id: string) {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/payment/${id}`);
        await this.fetchData(paymentURL, 'PUT');

        return {
            message: 'Successfully'
        };
    }
}

class ClientSession  {
    protected readonly BASE_URL = 'https://api.o2pay.co/api';
    protected readonly version: Version;

    private cookie: string | null = null;
    private csrf: string | null = null;
    private requestId: string | null = null;

    constructor(version: Version) {
        this.version = version
    }

    private checkInitialization() {
        if (!this.cookie || !this.csrf || !this.requestId) {
            throw new Error('Not initialized');
        }
    }

    protected async fetchData(url: string, method: string, body?: object): Promise<Response> {
        const headers = {
            'Application': 'application/json',
            'Cookie': this.cookie!,
            'Content-Type': 'application/json',
            'X-Csrf-Token': this.csrf!,
            'X-Request-Id': this.requestId!
        };

        const options: RequestInit = {
            method, headers, body: body ? JSON.stringify(body) : undefined,
        };

        return await fetch(url, options);
    }

    public async init() {
        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/csrf-cookie`);
        const response = await this.fetchData(paymentURL, 'GET');

        this.cookie = response.headers.get('Set-Cookie');
        this.csrf = response.headers.get('X-Csrf-Token');
        this.requestId = response.headers.get('X-Request-Id');
    }

    public getPaymentUrl(path: string): string {
        return `${this.BASE_URL}${path}`;
    }

    public async convertCurrency(convert: ConvertCurrency): Promise<CurrencyConverted> {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(
            `/payment/${this.version}/currency-convert?` +
            `fiatCurrency=${convert.fiatCurrency}&` +
            `fiatAmount=${convert.fiatAmount}&` +
            `cryptoCurrency=${convert.cryptoCurrency}`
        );

        const response = await this.fetchData(paymentURL, 'GET');
        return response.json();
    }

    public async getPaymentMethods(id: string): Promise<SupportedMethods> {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/payment/${id}/supported-method`);
        const response = await this.fetchData(paymentURL, 'GET');

        return response.json();
    }

    public async updatePaymentMethod(id: string, method: SupportedMethod) {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/payment/${id}/method`);
        const response = await this.fetchData(paymentURL, 'POST', method);

        return response.json();
    }

    public async updatePaymentCustomer(id: string, customer: PaymentCustomer) {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/payment/${id}/customer`);
        const response = await this.fetchData(paymentURL, 'POST', customer);

        return response.json();
    }

    public async updatePayment(id: string) {
        this.checkInitialization();

        const paymentURL = this.getPaymentUrl(`/payment/${this.version}/payment/${id}`);
        await this.fetchData(paymentURL, 'PUT');

        return {
            message: 'Successfully'
        };
    }
}

export type {
    Config,
    ConvertCurrency,
    CurrencyConverted,
    Payment,
    PaymentCreated,
    PaymentCreation,
    PaymentCustomer,
    PaymentInfo,
    PaymentMethod,
    SupportedMethod,
    SupportedMethods,
    Webhook
};

export {
    BlockChain,
    Client,
    ClientSession,
    Cryptocurrency,
    FiatCurrency,
    Session,
    Status,
    Version,
};
