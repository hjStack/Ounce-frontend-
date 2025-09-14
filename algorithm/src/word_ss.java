import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class word_ss {
    public static void main(String[] args) throws IOException {

        BufferedReader bufferedReader=new BufferedReader(new InputStreamReader(System.in));
        String line=bufferedReader.readLine();

        for(int i=0; i<line.length(); i++){
            char s[]=new char[line.length()];  // 가장 많이 사용된 알파벳을 출력
            // 문자를 하나씩 가져와서
            int count=0;

            // 첫째 줄에 이 단어에서 가장 많이 사용된 알파벳을 대문자로 출력한다.
            // 단, 가장 많이 사용된 알파벳이 여러 개 존재하는 경우에는 ?를 출력한다.

            if (line.charAt(i) >= 'A' && line.charAt(i) <= 'Z'){
                // baaa
                // line.charAt(i).equals("a") -> a의 카운트 증가
                // Mississipi -> line.charAt(i).equals("i") -> i의 카운트 증가
                char st[]=new char[line.length()];

                // 1. 각 알파벳의 사용 횟수를 세기
                // 2. 가장 많이 사용된 알파벳을 찾기
                // 3. 알파벳이 여러개면 ? 출력, 대문자로 출력

                for(int j=0; j<26; j++){
                    int max=0;
                    if (s[j] > max){

                    }
                }
            }
        }
    }
}
