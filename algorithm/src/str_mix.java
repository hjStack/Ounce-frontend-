
public class str_mix {
    public static String str_mix(String str1, String str2) {
        StringBuilder answer = new StringBuilder();

        int length = Math.min(str1.length(), str2.length());

        for (int i = 0; i < length; i++) {
            answer.append(str1.charAt(i)).append(str2.charAt(i));
        }

        return answer.toString();
    }

    public static void main(String[] args) {
        System.out.println(str_mix("aaaaa","bbbbb"));
    }
}
