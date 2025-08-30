import java.io.*;

public class number_Sum {
    public static void main(String[] args) throws IOException {

        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(System.out)); // 선언

        int n = Integer.parseInt(br.readLine()); // 숫자 개수
        String numbers = br.readLine();
        int sum = 0;

        for (int i = 0; i < n; i++) {
            sum += numbers.charAt(i) - '0';
        }

        bw.write(String.valueOf(sum));
        bw.flush();
        bw.close();
    }
}
