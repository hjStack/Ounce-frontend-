import java.util.Arrays;

public class count_down {

    public static int[] count_down(int start_num, int end_num) {
        int[] answer = new int[start_num-end_num+1];

        // start_num부터 end_num까지 출력하려면
        // 10 9 8 7 6 5 4 3
        for(int i=start_num; i>= end_num; i--){
            answer[Math.abs(i-start_num)] = i;
        }

        return answer;
    }

    public static void main(String[] args) {
        System.out.println(Arrays.toString(count_down(10, 3)));
    }
}
