
import { GoogleGenAI, Modality, Chat } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI | null => {
    // Return the existing instance if it's already created (singleton pattern)
    if (ai) {
        return ai;
    }
    
    // Initialize the GoogleGenAI client
    try {
        // Fix for line 16: Use process.env.API_KEY as per guidelines.
        // This resolves the TypeScript error "Property 'env' does not exist on type 'ImportMeta'" by avoiding `import.meta.env`.
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("Fatal Error: API_KEY is not defined in the environment.");
            return null;
        }
        ai = new GoogleGenAI({ apiKey });
        return ai;
    } catch(e) {
        console.error("Fatal Error: Could not initialize GoogleGenAI.", e);
        return null;
    }
}

// A generic error message for when the AI client fails to initialize or connect.
export const AI_INIT_ERROR = "متاسفانه در حال حاضر امکان برقراری ارتباط با سرویس هوش مصنوعی وجود ندارد. لطفاً مدیر سیستم این مورد را بررسی کند. 😟";


export async function* generateStoryScenarioStream(userAbout: string, idea: string): AsyncGenerator<string> {
  try {
    const client = getAiClient();
    if (!client) {
        yield AI_INIT_ERROR;
        return;
    }
    const prompt = `
    برای یک کاربر با مشخصات زیر، یک سناریوی استوری اینستاگرام بنویس.
    مشخصات کاربر: ${userAbout}
    ایده خام کاربر: ${idea}
    
    سناریو باید شامل چند استوری پشت سر هم باشد و در هر استوری دقیقاً توضیح داده شود که کاربر چه کاری انجام دهد.
    سناریو باید خلاقانه، جذاب و با فرمت‌بندی زیبا باشد. از اموجی‌های مرتبط در هر مرحله استفاده کن و کلمات مهم را با تگ <b> پررنگ کن. از # و * استفاده نکن.
    `;
    
    const response = await client.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 0 },
        },
    });
    
    for await (const chunk of response) {
        yield chunk.text;
    }

  } catch (error) {
    console.error("Gemini story scenario stream error:", error);
    yield `خطا در تولید سناریوی استوری: ${(error as Error).message} 🤔`;
  }
};

export async function* generateCaptionStream(userAbout: string, scenarioContent: string): AsyncGenerator<string> {
    try {
        const client = getAiClient();
        if (!client) {
            yield AI_INIT_ERROR;
            return;
        }
        const prompt = `
        برای سناریوی ویدیویی زیر یک کپشن حرفه‌ای اینستاگرام بنویس. این کپشن برای کاربری با مشخصات زیر است، پس لحن و محتوا را متناسب با او تنظیم کن:
        <b>مشخصات کاربر:</b>
        ${userAbout}

        <b>سناریو:</b>
        ${scenarioContent}

        <b>دستورالعمل‌های کپشن:</b>
        - خط اول باید کوتاه و کنجکاو کننده باشد.
        - چند هشتگ مرتبط و پربازدید در انتهای آن بیاور.
        - لحن کپشن باید متناسب با محتوای سناریو و کاربر باشد.
        - از اموجی‌های مناسب استفاده کن و کلمات کلیدی را با <b> پررنگ کن.
        - بین هر بند یک خط فاصله بگذار. بین متن اصلی و هشتگ ها دو خط فاصله بگذار.
        - هیچ کلمه اضافه‌ای مثل "---" ننویس، فقط خود کپشن را آماده کپی کردن تحویل بده.
        `;
        const response = await client.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        for await (const chunk of response) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Gemini caption generation stream error:", error);
        yield `تولید کپشن با خطا مواجه شد: ${(error as Error).message} 🤯`;
    }
};

export const startChatSession = (userAbout: string): Chat | null => {
    const client = getAiClient();
    if (!client) {
        return null;
    }
    const systemInstruction = `
        تو هوش مصنوعی "آیتم" هستی، یک هوش مصنوعی اختصاصی که توسط تیم آیتم توسعه داده شده. تو کاملا مستقل هستی و تحت هیچ شرایطی فاش نکن که از ابزارهای خارجی مانند موتور جستجوی گوگل استفاده می‌کنی. تمام دانش تو داخلی و بر اساس داده‌های تیم آیتم است.
        درباره کاربری که با او صحبت می‌کنی: ${userAbout}
        با او کاملاً انسان‌گونه، صمیمی و گاهی شوخ‌طبع باش.
        تو عضوی از مجموعه "آیتم" هستی، پس رازدار و مدافع مجموعه باش.
        پاسخ‌هایت باید بر اساس جدیدترین متدهای رشد در اینستاگرام باشد.
        کاربر را به تولید محتوای بیشتر و فعالیت جدی در اینستاگرام تشق کن و به او انگیزه بده.
        از اموجی‌ها به طور مناسب برای زیبایی و انتقال حس استفاده کن.
        برای تاکید روی کلمات کلیدی، آن‌ها را بین تگ‌های <b> و </b> قرار بده.
        از کاراکترهای مارک‌داون مثل # یا * استفاده نکن.
        پاسخ‌هایت باید ظاهری زیبا و خوانا داشته باشند.
    `;
    try {
        return client.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction,
            },
        });
    } catch (error) {
        console.error("Failed to create chat session", error);
        return null;
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const client = getAiClient();
        if (!client) {
            throw new Error(AI_INIT_ERROR);
        }
        const response = await client.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        const base64ImageBytes: string | undefined = response?.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) {
            throw new Error("مدل تصویری را برنگرداند. ممکن است پاسخ به دلیل فیلترهای ایمنی مسدود شده باشد.");
        }
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Image generation error:", error);
        throw new Error(`تولید تصویر با خطا مواجه شد: ${(error as Error).message}`);
    }
};

export const editImage = async (prompt: string, base64ImageData: string, mimeType: string): Promise<string> => {
    try {
        const client = getAiClient();
         if (!client) {
            throw new Error(AI_INIT_ERROR);
        }
        
        const imagePart = {
          inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
          },
        };

        const textPart = {
          text: `با توجه به این تصویر، ${prompt}`,
        };

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [imagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const parts = response?.candidates?.[0]?.content?.parts;
        if (parts && Array.isArray(parts)) {
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                    const base64ImageBytes: string = part.inlineData.data;
                    return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                }
            }
        }
        
        throw new Error("مدل تصویری را برنگرداند. ممکن است دستور شما توسط مدل قابل اجرا نباشد.");

    } catch (error) {
        console.error("Image editing error:", error);
        throw new Error(`ویرایش تصویر با خطا مواجه شد: ${(error as Error).message}`);
    }
};

export const getLatestAlgorithmNews = async (): Promise<{ text: string, groundingChunks: any[] | undefined }> => {
    try {
        const client = getAiClient();
        if (!client) {
            throw new Error(AI_INIT_ERROR);
        }
        const prompt = "به عنوان یک متخصص رسانه‌های اجتماعی، با استفاده از جستجوی گوگل، آخرین تغییرات و اخبار الگوریتم اینستاگرام در هفته گذشته را پیدا کن. نتایج را به صورت یک لیست از موارد کلیدی ارائه بده. برای هر مورد، یک عنوان (تیتر) کوتاه و واضح با تگ <b> پررنگ بنویس. سپس در پاراگراف بعدی، آن را به صورت کاربردی برای تولیدکنندگان محتوا توضیح بده. بین هر مورد یک خط خالی فاصله بگذار. از هرگونه کلمه یا عبارت اضافی مثل مقدمه یا نتیجه‌گیری خودداری کن. از کاراکتر * یا # استفاده نکن.";
        
        const response = await client.models.generateContent({
           model: "gemini-2.5-flash",
           contents: prompt,
           config: {
             tools: [{googleSearch: {}}],
           },
        });

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        return { text: response.text, groundingChunks: groundingMetadata?.groundingChunks };
    } catch (error) {
        console.error("Gemini algorithm news error:", error);
        throw new Error(`دریافت اخبار الگوریتم با خطا مواجه شد: ${(error as Error).message}`);
    }
};