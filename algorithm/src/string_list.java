public class string_list {

    public static String string_list(String[] arr) {
        String answer = "";

        for (int i=0; i< arr.length; i++){
           answer+=arr[i];
        }
        return answer;
    }

    public static void main(String[] args) {
        String str1[]={"a","b","c"};

        string_list(str1);
    }
}
