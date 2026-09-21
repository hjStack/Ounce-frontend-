import java.io.*;

public class review2 {
    public static void main(String[] args) throws IOException {

        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(System.in));
        BufferedWriter bw= new BufferedWriter(new OutputStreamWriter(System.out));

        int num=Integer.parseInt(bufferedReader.readLine());
        int count[]=new int[26];

        for(int i=0; i<num; i++){
            String name=bufferedReader.readLine();

            for(int j=0; j<name.length(); j++){

                char c=name.charAt(j);
                if (c >= 'a' && c<= 'z'){
                    count[c-'a']++;
                }
            }

            int max=-1;
            char result='?';

            for(int k=0; k<26; k++){

                if (count[k] > max){
                   max=count[k];
                   result= (char)(k+'a');
                   // // k를 문자로 변환하여
                    // 'a'부터 시작하는 알파벳으로 구한다
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
