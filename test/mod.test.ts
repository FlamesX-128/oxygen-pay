import { Client, Cryptocurrency, FiatCurrency } from '../src/mod.ts';

const MerchantId = '';
const Token = '';

(async () => {
    try {
        // Create a new client
        const client = new Client({
            merchantId: MerchantId,
            token: Token
        });

        // Create Payment
        const paymentCreated = await client.createPayment({
            currency: FiatCurrency.EUR,
            description: 'Some Product',
            price: 10,
            redirectUrl: 'https://t.me/R4nsomBot',
            isTest: true,
        });

        // Get paymentId
        const paymentId = paymentCreated.paymentUrl.split('/').at(-1)!;
        console.log("Payment Created:", paymentCreated);

        // Get Payment
        const getPayment = await client.getPayment(paymentId);
        console.log("Get Payment:", getPayment);

        // Create Session
        const session = await client.createSession();

        // Convert Currency
        const currencyConverted = await session.convertCurrency({
            cryptoCurrency: Cryptocurrency.ETH,
            fiatAmount: 100,
            fiatCurrency: FiatCurrency.EUR
        });

        console.log("Currency Converted:", currencyConverted);

        // Get Payment Methods
        const supportedMethods = await session.getPaymentMethods(paymentId);
        const paymentMethod = supportedMethods.availableMethods[0];

        console.log("Supported Methods:", supportedMethods);
        console.log("Payment Method:", paymentMethod);

        // Update Payment Method
        const response_2 = await session.updatePaymentMethod(paymentId, paymentMethod);
        console.log("Update Payment Method:", response_2);

        // Update Payment Customer
        const response_1 = await session.updatePaymentCustomer(paymentId, {
            email: 'b@gmail.com'
        });
        console.log("Update Payment Customer:", response_1);

        // Update Payment
        const updated = await session.updatePayment(paymentId);
        console.log("Updated Payment:", updated);

        // Get Updated Payment
        const getPayment_2 = await client.getPayment(paymentId);
        console.log("Get Updated Payment:", getPayment_2);

    } catch (error) {
        console.error("Error:", error);
    }
})();
