import java.util.Scanner;

public class b {
    public static void main(String[] args) {

        Scanner sc = new Scanner(System.in);
        String a = sc.next();
        String answer="";

        // 대소문자 바꿔서 출력하기

        for(int i=0; i<a.length(); i++){

            char c=a.charAt(i);

            if (c >= 'a' && c <= 'z'){
               answer += Character.toUpperCase(c);
               // 더하기 연산자로 문자열과 문자를 더할 수 있음
            }
            if (c >= 'A' && c <= 'Z'){
                answer += Character.toLowerCase(c);
            }
        }

        System.out.println(answer);
    }
}
