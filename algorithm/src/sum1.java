import java.util.Scanner;

public class sum1 {

    public static String sum1(String my_string, String overwrite_string, int s) {
     // 문자열의 특정위치에 다른 문자열을 붙이려면 stringBuilder
        StringBuilder stringBuilder = new StringBuilder(my_string);

        for (int i=0; i<overwrite_string.length(); i++){
//           stringBuilder.insert(s+i,overwrite_string.charAt(i));
            stringBuilder.setCharAt(s+i,overwrite_string.charAt(i));
        }

        return stringBuilder.toString();
    }

    public static void main(String[] args) {
        System.out.println(sum1("He11oWor1d","lloWorl",2));
    }
}
