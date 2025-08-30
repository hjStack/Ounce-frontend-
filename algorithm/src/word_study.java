import java.io.*;

public class word_study {
    public static void main(String[] args) throws IOException {

        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(System.in));
        BufferedWriter bufferedWriter = new BufferedWriter(new OutputStreamWriter(System.out));

        String s1=bufferedReader.readLine();
        int count[]=new int[26];
        int max=-1;
        char result='?';

        for(int i=0; i<s1.length(); i++){
            if (count[i] > max){
                max=count[i];
            }
        }

        bufferedWriter.flush();
        bufferedWriter.close();
    }
}
