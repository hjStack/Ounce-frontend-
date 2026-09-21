import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

public class Solution {

    public static void main(String[] args) {

        String participant[]={"lee","kkk","wew"};
        String completion[]={"lee","kkk"};

        String result=solution(participant,completion);  // 완주하지 못한 선수 출력
        System.out.println(result);
    }

    public static String solution(String[] participant, String[] completion) {

        HashMap<String,Integer> map=new HashMap<>();
        String answer="";

        // 없으면 0을 리턴하고 있으면 p를 리턴

        for(String p:participant){
            map.put(p,map.getOrDefault(p,0)+1);
            // 없으면 0을 리턴하고 있으면 1을 증가시킴
        }

        for (String c:completion){

            //있으면 1을 감소
            map.put(c,map.get(c)-1);
        }

        for (String c:map.keySet()){
            // 완주하지 못한 사람
            if (map.get(c) > 0){
                answer=c;
                break;
            }
        }

        return answer;

    }
}