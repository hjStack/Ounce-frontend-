const MAX_UPLOAD_IMAGE_BYTES = 900 * 1024;
const MAX_ORIGINAL_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52];
const IMAGE_OUTPUT_TYPE = "image/webp";

export function readableFileSize(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export async function prepareProductImage(file: File) {
    if (!file.type.startsWith("image/")) {
        throw new Error("이미지 파일만 등록할 수 있습니다.");
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("JPG, PNG, WEBP 이미지만 등록할 수 있습니다.");
    }
    if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
        throw new Error(`이미지는 ${readableFileSize(MAX_ORIGINAL_IMAGE_BYTES)} 이하만 등록할 수 있습니다.`);
    }
    if (file.size <= MAX_UPLOAD_IMAGE_BYTES) {
        return ensureImageFileExtension(file);
    }

    return compressProductImage(file);
}

function ensureImageFileExtension(file: File) {
    if (/\.(jpe?g|png|webp)$/i.test(file.name)) return file;

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    return new File([file], `${file.name || "product-image"}.${extension}`, { type: file.type, lastModified: file.lastModified });
}

async function compressProductImage(file: File) {
    const image = await loadImage(file);
    const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 처리하지 못했습니다.");
    context.drawImage(image, 0, 0, width, height);

    for (const quality of IMAGE_QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, IMAGE_OUTPUT_TYPE, quality);
        if (blob.size <= MAX_UPLOAD_IMAGE_BYTES || quality === IMAGE_QUALITY_STEPS[IMAGE_QUALITY_STEPS.length - 1]) {
            return new File([blob], `${filenameWithoutExtension(file.name) || "product-image"}.webp`, {
                type: IMAGE_OUTPUT_TYPE,
                lastModified: Date.now(),
            });
        }
    }

    return ensureImageFileExtension(file);
}

function loadImage(file: File) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("이미지를 읽지 못했습니다. 다른 파일을 선택해주세요."));
        };
        image.src = url;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error("이미지를 압축하지 못했습니다."));
            },
            type,
            quality,
        );
    });
}

function filenameWithoutExtension(name: string) {
    return name.replace(/\.[^.]+$/, "");
}
