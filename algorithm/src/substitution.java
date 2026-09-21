
import java.io.*;
import java.util.Scanner;

public class substitution {
    public static void main(String[] args)throws IOException {

        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(System.out));

        int num=Integer.parseInt(br.readLine());

        for(int i=0; i<num; i++){
           String name=br.readLine();
           int[] count = new int[26];     // 알파벳 빈도 저장

            for (int j = 0; j < name.length(); j++) {
                char c = name.charAt(j);

                // 소문자인경우
                if (c >= 'a' && c <= 'z') {
                    count[c - 'a']++;
                }
            }

           int max=-1;
           char result='?';

            for(int k=0; k<26; k++){
               if (count[k] > max){
                   max=count[k];
                   result=(char)(k+'a');
               }
               else if (count[k] == max){
                   result='?';
               }
           }

            bw.write(result + "\n");
        }
        bw.flush();
        bw.close();
    }
}
