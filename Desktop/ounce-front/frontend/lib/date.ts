export function formatDate(iso?: string, withTime = false) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";

    const pad = (value: number) => String(value).padStart(2, "0");
    const day = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
    return withTime ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

export function hoursSince(iso?: string) {
    if (!iso) return 0;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 0;
    return (Date.now() - date.getTime()) / 3_600_000;
}
